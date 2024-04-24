use aws_config::BehaviorVersion;
use aws_sdk_s3::primitives::ByteStream;
use image::ImageFormat;
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use tracing_subscriber::{self};
use tracing::Level;

#[derive(Debug, Serialize, Deserialize)]
struct MyLambdaEvent {
    image_key: String,
    orientation: String,
    target_size: String,
    bucket_name: String
}


#[derive(Debug, Serialize, Deserialize)]
struct LambdaOutput {
    small_image_key: String,
    medium_image_key: String,
    large_image_key: String,
    orientation: String,
    upload_time: String,
    user: String
}

async fn function_handler(event: LambdaEvent<MyLambdaEvent>) -> Result<LambdaOutput, Error> {

    let (event, _context) = event.into_parts();

    //TODO - fix hard coded region
    let config = aws_config::defaults(BehaviorVersion::v2023_11_09())
        .region("ap-southeast-2")
        .load()
        .await;
    let s3_client = aws_sdk_s3::Client::new(&config);

    // Download the image from S3
    let object = s3_client
        .get_object()
        .bucket(&event.bucket_name)
        .key(&event.image_key)
        .send()
        .await
        .map_err(|e| Error::from(e.to_string()))?;

    let data = object.body.collect().await.map_err(|e| Error::from(e.to_string()))?.into_bytes();

    // Load the image using the `image` crate
    let img = image::load_from_memory(&data).map_err(|e| Error::from(e.to_string()))?;

    // Determine the new max dimension based on target size small or medium
    let new_max_dimension = if event.target_size.as_str() == "small" { 300 } else { 1000 };

    //TODO - throw an error instead
    let (new_width, new_height) = match event.orientation.as_str() {
        "landscape" => (new_max_dimension, img.height() * new_max_dimension / img.width()),
        "portrait" => (img.width() * new_max_dimension / img.height(), new_max_dimension),
        _ => return Err(Error::from("Invalidation orientation provided")),
    };

    let resized_img = img.resize(new_width, new_height, image::imageops::FilterType::Lanczos3);

    //TODO - needs to be looked at, what if people want to update files named with dashes,
    //unwrap_or shouldnt exist, do i want to let people upload files without extensions etc etc....
    let mut prefix_parts: Vec<&str> = event.image_key.split('/').collect();
    prefix_parts[1] = &event.target_size;
    let last_part = prefix_parts.last().expect("Expected at least one part in the path");


    // Split the last part (filename.extension) into the base filename and extension
    let (file_base, file_extension) = last_part.rsplit_once('.')
        .expect("Expected a file extension"); // This will panic if there's no dot in the last part
    let (first_part, _last_part) = match file_base.rsplit_once('-') {
        Some((first, last)) => (first, last),
        None => return Err(Error::from("Invalidation file name, given to resize lambda, (where is the -large, -medium??)"))
    };

    let new_file_name = format!("{}-{}.{}", &first_part, &event.target_size, &file_extension);
    prefix_parts[2] = &new_file_name;


    // Determine the image format from the original file extension
    let format: ImageFormat = match file_extension {
        "png" => ImageFormat::Png,
        "gif" => ImageFormat::Gif,
        "bmp" => ImageFormat::Bmp,
        // Add more formats as needed
        _ => ImageFormat::Jpeg, // Default to JPEG if unknown
    };

    let new_key = prefix_parts.join("/");

    // Convert the resized image to bytes
    let mut resized_img_bytes: Vec<u8> = Vec::new();
    resized_img.write_to(&mut Cursor::new(&mut resized_img_bytes), format)
        .map_err(|e| format!("Failed to write image to bytes: {}", e))?;

    // Upload the resized image to S3
    s3_client.put_object()
        .bucket(&event.bucket_name)
        .key(&new_key)
        .body(ByteStream::from(resized_img_bytes))
        .send()
        .await
        .map_err(|e| format!("Failed to upload resized image: {}", e))?;

    Ok(LambdaOutput {
        medium_image_key: "mediumimagekey".to_string(),
        small_image_key: "smallimagekey".to_string(),
        large_image_key: "largeimagekey".to_string(),
        orientation: event.orientation,
        user: "USER1".to_string(),
        upload_time: "uploadtime".to_string()
    })
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

    run(service_fn(function_handler)).await
}
