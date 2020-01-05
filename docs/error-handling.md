<a href="../README.md">back to README</a>

# Interpreting Error Responses

When encountering an error while performing operations on multiple items, 
e.g. copyFolder(), Solid-File-Client will record the error and
continue with the operation.

Here are the fields in error responses.

## name

The name of the error (e.g. SFCFetchError).

## status

If a single response error occurred, the number of that error, e.g. 404.  If multiple errors occured -2.  If something other than a response error -1.

# statusText

A text description of the error.

# url

The url that the error occurred on.

# message

Includes status codes, statusTexts and for some errors solid specific explanations why it probably happened.

# succesful

An array of successful responses in the case of multiple-item operations.

# rejected 

An array of responses for failed requests in the case of multiple-item operations.

# rejectedErrors 

An array of SingleResponseErrors (has properties .response and .message)

# errors 

An array of errors not related to failed requests.
