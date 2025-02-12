import z from "zod"

export const addThreadSchema = z.object({
    content: z.string().min(3, "Thread length should be of minimum 3 characters"),
    tags: z.array(z.string()).min(1).optional(),
})

export const addTagSchema = z.object({
    tagName: z.string().min(1, "Thread length should be of minimum 1 character").max(30, "Thread length cannot be more than 30 characters"),
})