use lambda_runtime::{Error, LambdaEvent, run, service_fn};
use serde_json::{Value, json};
use serde::{Deserialize, Serialize};
use tracing_subscriber;
use tracing::Level;

#[derive(Debug, Serialize, Deserialize, Default)]
struct ImageInfo {
    upload_time: String,
    orientation: String,
    small_image_key: Option<String>,
    medium_image_key: Option<String>,
    large_image_key: Option<String>,
    user: String,
}

async fn function_handler(event: LambdaEvent<Value>) -> Result<Value, Error> {
    // Deserialize the event payload into a Vec<ImageInfo>
    let image_infos: Vec<ImageInfo> = serde_json::from_value(event.payload)?;

    let mut merged_info = ImageInfo::default();

    for info in image_infos {

        //TODO - These 3 will always match, maybe simplify logic to reflect that, OR ensure payload
        //injected contains array for the image_keys and keeps these outside of that array
        merged_info.upload_time = if merged_info.upload_time.is_empty() { info.upload_time } else { merged_info.upload_time };
        merged_info.large_image_key = merged_info.large_image_key.clone().or(info.large_image_key);
        merged_info.orientation = if merged_info.orientation.is_empty() { info.orientation } else { merged_info.orientation };

                 
        merged_info.small_image_key = merged_info.small_image_key.clone().or(info.small_image_key);
        merged_info.medium_image_key = merged_info.medium_image_key.clone().or(info.medium_image_key);
        merged_info.user = if merged_info.user.is_empty() { info.user } else { merged_info.user };

    }

    // Convert merged_info back into a JSON Value to return
    Ok(json!(merged_info))
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt().with_max_level(Level::INFO).init();

    run(service_fn(function_handler)).await
}
