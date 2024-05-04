variable "github_token" {
  description = "Github token used for generating/editing/deleting webhooks in the familyvault repo"
  type        = string
}

variable "webhook_secret" {
  description = "Secret included in request, read by api gateway authorizer"
  type        = string
}

variable "apigateway_webhook_url" {
  description = "Webhook URL for CDK pipeline"
  type        = string
}

//TODO - have pipeline auto trigger webhook to cicd to rerun terraform? weird ?
# variable "webhook_url_terraform" {
#   description = "Webhook URL for Terraform pipeline"
#   type        = string
# }

