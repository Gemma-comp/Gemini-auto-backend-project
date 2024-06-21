import { Request, Response } from "express";
import genCode from "../utils/gen_code.js";
import { writeFileSync } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const controller = async (req: Request, res: Response) => {
    const { query } = req.body;
    try {
        const code = await genCode(query);
        const fileName = "generatedCode.js";

        writeFileSync(fileName, `${code}`);

        const { stdout, stderr } = await execFileAsync('node', [fileName]);

        if (stderr) {
            return res.status(500).json({ error: stderr });
        }

        return res.status(200).json({ output: stdout.replace(/[\n\\]/g, '') });
    } catch (e) {
        return res.status(500).json({ error: e });
    }
}

export default controller;
