import z from "zod"

export const addThreadSchema = z.object({
    content: z.string().min(3, "Thread length should be of minimum 3 characters").optional(),
    tags: z.string().min(1).optional(), // need to send tag ids from the frontend in this manner -> "1, 2, 4, 5, 2, 2, 1"
})

export const addTagSchema = z.object({
    tagName: z.string().min(1, "Thread length should be of minimum 1 character").max(30, "Thread length cannot be more than 30 characters"),
})

export const editThreadSchema = z.object({
    content: z.string().min(3, "Thread length should be of minimum 3 characters").optional(),
    tags: z.string().min(1).optional(), // need to send tag ids from the frontend in this manner -> "1, 2, 4, 5, 2, 2, 1"
})

export const addCommentSchema = z.object({
    content: z.string().min(1, "Comment should be of 1 character").optional(),
    parent: z.enum(['thread', 'comment']).refine(value => ['thread', 'comment'].includes(value), {
        message: "Invalid Parent, parent should be comment or thread"
    })
});

export const editCommentSchema = z.object({
    content: z.string().min(1, "Comment should be of 1 character").optional(),
});

export const likePostSchema = z.object({
    parent: z.enum(['thread', 'comment']).refine(value => ['thread', 'comment'].includes(value), {
        message: "Invalid Parent, parent should be comment or thread"
    })
});

export const userSigninSchema = z.object({
    username: z.string().min(3, "Username should contain atleast 3 characters"),
    password: z.string().min(6, "Password should contain atleast 6 characters")
});

export const adminSigninSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1).refine(password => /!/.test(password))
})


// doing it optional due to image 