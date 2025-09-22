import z from "zod"

export const addThreadSchema = z.object({
    content: z.string().min(3, "Thread length should be of minimum 3 characters").optional(),
    tags: z.string().min(1).optional(), // need to send tag ids from the frontend in this manner -> "1, 2, 4, 5, 2, 2, 1"
})
