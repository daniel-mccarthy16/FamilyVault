use std::io::Write;
use aws_config::BehaviorVersion;
use lambda_runtime::tracing::trace;
use lambda_runtime::{Error, LambdaEvent, service_fn};
use serde_json::{Value, json};
use tracing::Level;
use tracing_subscriber;
use imagesize::{ImageSize, ImageResult};
use serde::{Serialize, Serializer};
use serde_json::to_string;

#[derive(Serialize)]
struct TaskOutput {
    width: u16,
    height: u16,
    orientation: Orientation,
    size_classification: SizeClassification,
    s3_key: String,
    time: String,
    bucket_name: String,
    image_size: u64
}

#[derive(Serialize)]
enum Orientation {
    #[serde(rename = "portrait")]
    Portrait,
    #[serde(rename = "landscape")]
    Landscape,
}

#[derive(Serialize)]
enum SizeClassification {
    #[serde(rename = "small")]
    Small,
    #[serde(rename = "medium")]
    Medium,
    #[serde(rename = "large")]
    Large,
}
//TODO - is there a way to share these types among all rust functions within a step function?
impl SizeClassification {
    fn as_str(&self) -> &'static str {
        match self {
            SizeClassification::Small => "small",
            SizeClassification::Medium => "medium",
            SizeClassification::Large => "large",
        }
    }
}

async fn validate_and_transform(event: LambdaEvent<Value>) -> Result<Value, Error> {

    let bucket = event.payload["detail"]["bucket"]["name"].as_str()
        .ok_or_else(|| Error::from("Missing bucket name"))?;
    let key = event.payload["detail"]["object"]["key"].as_str()
        .ok_or_else(|| Error::from("Missing object key"))?;

    //TODO - remove requirement for region , its something to do with my local aws config
    let config = aws_config::defaults(BehaviorVersion::v2023_11_09())
        .region("ap-southeast-2")
        .load()
        .await;
    let s3_client = aws_sdk_s3::Client::new(&config);

    let mut buffer: Vec<u8> = Vec::new();

    let mut object = s3_client.get_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
        .map_err(|e| Error::from(format!("Failed to access S3 object: {}", e)))?;

    while let Some(bytes) = object.body.try_next().await.map_err(|e| Error::from(format!("Failed to read object bytes: {}", e)))? {
        buffer.write_all(&bytes).map_err(|e| Error::from(format!("Failed to write object bytes to buffer: {}", e)))?;
    }

    let image_size: ImageSize = get_image_properties(&buffer)?;
    let orientation: Orientation = if image_size.width > image_size.height { Orientation::Landscape } else { Orientation::Portrait };  
    let size_classification: SizeClassification = classify_image_size(&image_size);
    let new_key = generate_new_key_name(&key, &size_classification)?;
    rewrite_object_key(&s3_client, bucket, key, &new_key).await?;

    //TODO - make these error messages more informative
    let time = event.payload["time"].as_str()
        .ok_or_else(|| Error::from("Missing time"))?.to_string();

    let bucket_name = event.payload["detail"]["bucket"]["name"].as_str()
        .ok_or_else(|| Error::from("Missing bucket name"))?.to_string();

    let size = event.payload["detail"]["object"]["size"].as_u64()
        .ok_or_else(|| Error::from("Missing image size"))?;

    let task_output:  TaskOutput = TaskOutput {
        width: image_size.width as u16,
        height: image_size.height as u16,
        orientation,
        size_classification,
        s3_key: new_key,
        time,
        bucket_name,
        image_size: size

    };

    // TODO - can we cut out a step here? Struct -> string -> serde
    let serialized_task_output = serde_json::to_string(&task_output)
        .map_err(|e| Error::from(format!("Failed to serialize task output: {}", e)))?;
    let json_value: Value = serde_json::from_str(&serialized_task_output)
        .map_err(|e| Error::from(format!("Failed to convert string to Value: {}", e)))?;
    Ok(json_value)
}

fn get_image_properties(image_buffer: &[u8]) -> Result<ImageSize, Error> {
    match imagesize::blob_size(&image_buffer) {
        Ok(size) => Ok(size),
        Err(why) => Err(Error::from(format!("Couldnt get image dimensions: {}", why)))
    }
}

fn generate_new_key_name(old_key: &str, size_classification: &SizeClassification) -> Result<String, Error> {
    let size_classification_str = size_classification.as_str();
    let new_string = old_key.replacen("raw", size_classification_str, 1);
    if let Some((prefix, extension)) = new_string.rsplit_once('.') {
        let new_filename = format!("{}-{}.{}", prefix, size_classification_str, extension);
        Ok(new_filename)
    } else {
        return Err(Error::from("Invalid file: does not have an extension."))
    }
}

async fn rewrite_object_key(s3_client: &aws_sdk_s3::Client, bucket: &str, current_key: &str, new_key: &str) -> Result<(), Error> {

    s3_client.copy_object()
        .bucket(bucket)
        .copy_source(format!("{}/{}", bucket, current_key))
        .key(new_key)
        .send()
        .await
        .map_err(|e| Error::from(format!("Failed to copy object: {}", e)))?;

    s3_client.delete_object()
        .bucket(bucket)
        .key(current_key)
        .send()
        .await
        .map_err(|e| Error::from(format!("Failed to delete original object: {}", e)))?;

    Ok(())
}

fn classify_image_size(image_size: &ImageSize) -> SizeClassification {
    let largest_dimension = image_size.width.max(image_size.height);
    match largest_dimension {
        0..=500 => SizeClassification::Small,
        501..=1500 => SizeClassification::Medium,
        _ => SizeClassification::Large,
    }
}

#[tokio::main]
async fn main() -> Result<(), Error> {
   tracing_subscriber::fmt().json()
       .with_max_level(Level::DEBUG)
       .with_current_span(false)
       .with_ansi(false)
       .without_time()
       .with_target(false)
       .init();

   let func = service_fn(validate_and_transform);
   lambda_runtime::run(func).await?;
   Ok(())
}
