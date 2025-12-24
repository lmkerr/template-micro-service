variable "region" {
  description = "AWS Region"
  type        = string
  default     = "us-west-2"
}

variable "domain_base" {
  description = "Base domain name for the API Gateway"
  type        = map(string)
  default = {
    sandbox = "thing.api.sandbox.carousel.gg"
    dev     = "thing.api.dev.carousel.gg"
    prod    = "thing.api.prod.carousel.gg"
  }
}

variable "roles" {
  description = "Role ARNs for Terraform to assume to deploy to different AWS accounts"
  type        = map(any)
  default = {
    sandbox = "arn:aws:iam::423623857147:role/cicd"
    dev     = "arn:aws:iam::891376939351:role/cicd"
    prod    = "arn:aws:iam::905418365150:role/cicd"
  }
}

variable "hosted_zone_id" {
  description = "Hosted Zone ID"
  sensitive   = true
  type        = map(string)
  default = {
    sandbox = "Z00696811AZY8I5RSTK1I"
    dev     = "Z003215133IY7CUXBSS4K"
    prod    = "Z08507002AVLMBJGWHVCM"
  }
}
