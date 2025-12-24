locals {
  routes = {

    // Thing
    "POST /"            = aws_lambda_function.create_thing_lambda // Create a Thing
    "GET /{thingId}"    = aws_lambda_function.get_thing_lambda    // Get Thing by ID
    "PATCH /{thingId}"  = aws_lambda_function.update_thing_lambda // Update a Thing by ID
    "DELETE /{thingId}" = aws_lambda_function.delete_thing_lambda // Delete a Thing by ID
  }
}
