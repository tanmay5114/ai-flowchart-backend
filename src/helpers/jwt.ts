import jwt from "jsonwebtoken";

export default function generateJwtToken(id: string, secret: string): string {
    try {
        const token: string = jwt.sign({id}, secret , { expiresIn: '24h'});
        return token;
    }
    catch(error) {
        throw new Error("Error not generating")
    }
}