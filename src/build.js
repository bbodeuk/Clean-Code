import fs from "fs";
import path from "path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkGfm from "remark-gfm";
import rehypeStringify from "rehype-stringify";

const DOCS_DIR = path.resolve("./docs");
const OUTPUT_DIR = path.resolve("./dist");
const TEMPLATE = fs.readFileSync(
    path.resolve("./src/template/index.html"),
    "utf-8"
);

async function createFile({ fileName, content }) {
    const templated = TEMPLATE.replace("<!-- CONTENT -->", content);

    fs.writeFileSync(path.resolve(OUTPUT_DIR, fileName), templated);
}

async function parseFile(fileName) {
    const data = fs.readFileSync(path.resolve(DOCS_DIR, fileName), "utf-8");
    const parsed = await unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(remarkGfm)
        .use(rehypeStringify)
        .process(data);

    createFile({
        fileName: `${path.basename(fileName, path.extname(fileName))}.html`,
        content: parsed,
    });
}

function main() {
    fs.mkdir(OUTPUT_DIR, { recursive: true }, (err) => {
        if (err) throw err;
    });
    fs.readdirSync(DOCS_DIR).forEach(parseFile);
}

main();
