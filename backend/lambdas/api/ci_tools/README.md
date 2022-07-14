# Lambda for serving CI tools

This is a special API Gateway Lambda proxy so that CI environments that try to pull a
script during maintenance mode will get a proper HTTP 503 response instead of a 401.
