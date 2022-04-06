import fs from "fs";
import path from "path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkGfm from "remark-gfm";
import remarkToc from "remark-toc";
import remarkFootnotes from "remark-footnotes";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import config from "./config.js";

const DOCS_DIR = path.resolve("./docs");
const OUTPUT_DIR = path.resolve("./dist");
const NAVIGATION = fs.readdirSync(DOCS_DIR).sort((a, b) => {
    const regex = /[0-9]+/;
    const [numA] = a.match(regex) || [-1];
    const [numB] = b.match(regex) || [-1];

    return +numA - +numB;
});
const TEMPLATE = fs.readFileSync(
    path.resolve("./src/template/index.html"),
    "utf-8",
);

function makeDir(dirName) {
    fs.mkdir(dirName, { recursive: true }, (err) => {
        if (err) throw err;
    });
}

function getFileName(fileNameWithExtension) {
    return path.basename(
        fileNameWithExtension,
        path.extname(fileNameWithExtension),
    );
}

function createNavigation(fileName) {
    return `<ul>${NAVIGATION.map((file) => {
        const name = getFileName(file);

        if (name === "index") {
            return `<li><a href="/">${config.defaultTitle}</a></li>`;
        }

        return `<li${
            name === fileName ? ' class="highlight"' : ""
        }><a href="/${encodeURIComponent(name)}/">${name}</a></li$>`;
    }).reduce((acc, cur) => acc + cur, "")}</ul>`;
}

function createFile({ fileName, content, toc, info }) {
    const { title, author, date, description } = info;
    const descriptionFromContent = content
        .replace(/<.+?>/gm, "")
        .replace(/(\r?\n)+/gm, " ")
        .slice(0, 200);
    const templated = TEMPLATE.replace("<!-- CONTENT -->", content)
        .replace(/<!-- TITLE -->/gm, title)
        .replace(
            /<!-- DESCRIPTION -->/gm,
            description || descriptionFromContent,
        )
        .replace(/<!-- DATE -->/gm, new Date(date).toISOString())
        .replace(/<!-- AUTHOR -->/gm, author)
        .replace(/<!-- TOC -->/gm, toc)
        .replace(/<!-- NAVIGATION -->/gm, createNavigation(fileName))
        .replace(/(src=|href=|url\()"\//g, `$1"${config.baseURL}`);

    if (fileName === "index") {
        fs.writeFileSync(path.resolve(OUTPUT_DIR, "index.html"), templated);
        return;
    }

    fs.writeFileSync(
        path.resolve(OUTPUT_DIR, getFileName(fileName), "index.html"),
        templated,
    );
}

function parseInfo(regexMatchGroup, fileName) {
    const defaultValue = {
        title: fileName,
        author: "Anonymous",
        date: new Date().toISOString(),
        description: "",
    };

    if (!regexMatchGroup) {
        return defaultValue;
    }

    const [matchString] = regexMatchGroup;

    return {
        ...defaultValue,
        ...Object.fromEntries(
            matchString
                .replace(/(<!)?-->?/gm, "")
                .replace(/\r?\n/gm, "\n")
                .split("\n")
                .filter((x) => x !== "")
                .map((x) => x.split(":"))
                .map(([key, value]) => [key.trim(), value.trim()]),
        ),
    };
}

function addTocTitleToData(data) {
    const h2Regex = /^## .+/gm;
    const [matchHeading] = data.match(h2Regex) || [];

    if (matchHeading) {
        return data.replace(
            matchHeading,
            `\n\n## Table of contents\n\n${matchHeading}\n\n`,
        );
    }

    return `## Table of contents\n\n${data}`;
}

function addNavigationToData(data, index) {
    if (NAVIGATION.length < 1) {
        return data;
    }

    const getArticleTag = (type, rawTitle) => {
        const title = getFileName(rawTitle);
        const isIndexFile = title === "index";
        const titleToDisplay = isIndexFile ? config.defaultTitle : title;
        const uri = isIndexFile ? "/" : `/${title}/`;

        return `<article class="navigation-item navigation-item--${type.toLowerCase()}"><a href="${uri}"><div><div class="navigation-item__type">${type}</div><h2 class="navigation-item__title">${titleToDisplay}</h2></div><div><i class="icon-arrow_${
            type === "Previous" ? "back" : "forward"
        }"></i></div></a></article>`;
    };

    if (index < 1) {
        return `${data}<div class="navigation">${getArticleTag(
            "Next",
            NAVIGATION[1],
        )}</div>`;
    }

    if (NAVIGATION.length - 1 <= index) {
        return `${data}<div class="navigation">${getArticleTag(
            "Previous",
            NAVIGATION[NAVIGATION.length - 2],
        )}</div>`;
    }

    return `${data}<div class="navigation">${getArticleTag(
        "Previous",
        NAVIGATION[index - 1],
    )}${getArticleTag("Next", NAVIGATION[index + 1])}</div>`;
}

function parseTocFromContent(content) {
    const lineBreakFormatted = content.replace(/\r?\n/gm, "\n");
    const contentArray = lineBreakFormatted.split("\n");
    const { length } = contentArray;
    let ulOpenedCnt = 0;
    let ulClosedCnt = 0;
    const startIndex = contentArray.indexOf(
        '<h2 id="table-of-contents">Table of contents</h2>',
    );
    let endIndex = 0;

    for (let i = startIndex; i <= length; i++) {
        const currentLine = contentArray[i];

        if (currentLine === "<ul>") {
            ulOpenedCnt++;
        }

        if (currentLine === "</ul>") {
            ulClosedCnt++;
        }

        if (0 < ulClosedCnt && ulOpenedCnt === ulClosedCnt) {
            endIndex = i + 1;
            break;
        }
    }

    return {
        content: `${contentArray.slice(0, startIndex).join("\n")}${contentArray
            .slice(endIndex)
            .join("\n")}`,
        toc: `<div class="toc-container"><ul class="toc">${contentArray
            .slice(startIndex + 2, endIndex)
            .join("")}</div>`,
    };
}

async function createHtmlOutputWithMd(fileName, index) {
    const commentsRegex = /^<!--((.|\r?\n)*)-->$/gm;
    const data = fs.readFileSync(path.resolve(DOCS_DIR, fileName), "utf-8");
    const parsed = `${await unified()
        .use(remarkParse)
        .use(remarkFootnotes)
        .use(remarkToc)
        .use(remarkRehype)
        .use(rehypeSlug)
        .use(remarkGfm)
        .use(rehypeStringify)
        .process(addTocTitleToData(data))}`;
    const navigationAdded = addNavigationToData(parsed, index);
    const { content, toc } = parseTocFromContent(navigationAdded);

    createFile({
        fileName: path.basename(fileName, path.extname(fileName)),
        content,
        info: parseInfo(data.match(commentsRegex), fileName),
        toc,
    });
}

function main() {
    makeDir(OUTPUT_DIR);
    NAVIGATION.forEach((fileName) => {
        makeDir(path.resolve(OUTPUT_DIR, getFileName(fileName)));
    });
    NAVIGATION.forEach(createHtmlOutputWithMd);
}

main();
