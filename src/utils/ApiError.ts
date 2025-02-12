class ApiError extends Error {
    statusCode: number;
    success: boolean = false;
    errors?: any;

    constructor(statusCode: number, message = "Something went wrong", errors?: any) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;

        Error.captureStackTrace(this, ApiError);
    }
}

export { ApiError };
