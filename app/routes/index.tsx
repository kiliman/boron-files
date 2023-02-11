import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useSubmit } from "@remix-run/react";
import type { MouseEventHandler } from "react";
import { useCallback, useRef, useState } from "react";
import { getIconForFile, getIconForOpenFolder } from "vscode-icons-js";
import domtoimage from "~/libs/dom-to-image-more.client";
import { commitSession, getSession } from "~/session.server";

type ThemeType = {
  background: string;
  foreground: string;
  lines: string;
};
let defaultTheme: ThemeType = {
  background: "#15232d",
  foreground: "#cdcdcd",
  lines: "#cdcdcd",
};

export async function loader({ request }: LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const files = session.get("files") ?? "";
  const theme = session.get("theme") ?? defaultTheme;
  let tree: any = {};
  files
    .trim()
    .split("\n")
    .forEach((file: string) => {
      if (!file) return;
      let parts = file.includes("/") ? file.split("/") : file.split("\\");
      let current = tree;
      parts.forEach((part) => {
        if (part === ".") return;
        if (part.includes(":")) return;

        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      });
    });

  return json({ files, tree, theme });
}

export async function action({ request }: ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();

  let action = formData.get("action") as string;
  switch (action) {
    case "resetTheme": {
      session.set("theme", defaultTheme);
      break;
    }
    default: {
      const files = formData.get("files") as string;
      const theme = session.get("theme") ?? defaultTheme;
      theme.background = formData.get("background") as string;
      theme.foreground = formData.get("foreground") as string;
      theme.lines = formData.get("lines") as string;

      session.set("files", files);
      session.set("theme", theme);
      break;
    }
  }

  return redirect("/", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}

export default function Index() {
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submit = useSubmit();
  const [imageCopied, setImageCopied] = useState(false);
  const { files, tree, theme } = useLoaderData<typeof loader>();

  const doUpdate = useCallback(() => {
    setImageCopied(false);
    submit(formRef.current, { method: "post" });
  }, [submit]);

  const doCopyClipboard: MouseEventHandler<HTMLButtonElement> = useCallback(
    async (e) => {
      e.preventDefault();
      if (typeof ClipboardItem && navigator.clipboard.write) {
        const image = new ClipboardItem({
          // @ts-expect-error
          "image/png": domtoimage
            .toBlob(containerRef.current!, {
              bgcolor: theme.background,
            })
            .catch((error: Error) => console.error(error)),
        });
        navigator.clipboard.write([image]);
        setImageCopied(true);
      }
    },
    [theme.background]
  );

  return (
    <div className="flex flex-col flex-1">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-teal-300">Boron Files</h1>
        <h2 className="text-2xl  mt-4">
          Create and share beautiful images of your file list.
          <br />
          Start typing into the text area to get started.
        </h2>
      </div>
      <Form method="post" ref={formRef}>
        <div className="mt-12 mx-8 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <label className="inline-flex items-center">
              Background Color
              <input
                type="color"
                name="background"
                className="ml-2"
                defaultValue={theme.background}
                onChange={doUpdate}
              />
            </label>
            <label className="inline-flex items-center">
              Text Color
              <input
                type="color"
                name="foreground"
                className="ml-2"
                defaultValue={theme.foreground}
                onChange={doUpdate}
              />
            </label>
            <label className="inline-flex items-center">
              Line Color
              <input
                type="color"
                name="lines"
                className="ml-2"
                defaultValue={theme.lines}
                onChange={doUpdate}
              />
            </label>
            <button
              name="action"
              value="resetTheme"
              className="px-4 py-2 bg-gray-700 text-gray-100 inline-flex gap-2 items-center rounded hover:bg-gray-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                />
              </svg>
              Reset Theme
            </button>
          </div>
          <button
            className="px-4 py-2 bg-gray-700 text-gray-100 inline-flex gap-2 items-center rounded hover:bg-gray-600"
            onClick={doCopyClipboard}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z"
              />
            </svg>
            {imageCopied ? "Image Copied" : "Copy Image"}
          </button>
        </div>
        <div className="flex m-8 gap-8">
          <textarea
            name="files"
            className="flex-1 p-4 text-black rounded-xl"
            style={{ flex: "1", minHeight: "33vh", padding: "1rem" }}
            defaultValue={files}
            onChange={doUpdate}
          />
          <div
            ref={containerRef}
            className="flex-1 px-8 py-4 rounded-xl"
            style={{
              backgroundColor: theme.background,
              borderColor: theme.background,
              color: theme.foreground,
            }}
          >
            <Tree tree={tree} theme={theme} />
          </div>
        </div>
      </Form>
      <div>
        <div className="flex flex-col items-center text-gray-200 text-lg gap-2">
          <div className="text-2xl">💡 To get a file listing:</div>
          <div>
            macOS:{" "}
            <code className="bg-gray-200 text-gray-800 px-2 py-1 rounded">
              find [directory] -type f
            </code>
          </div>
          <div>
            Windows:{" "}
            <code className="bg-gray-200 text-gray-800 px-2 py-1 rounded">
              dir /bs [directory]
            </code>
          </div>
        </div>
      </div>
      <footer className="mt-8">
        <div className="text-center text-gray-500 text-sm flex justify-center gap-4">
          <div>
            Inspired by{" "}
            <a className="text-gray-200" href="https://carbon.now.sh">
              Carbon
            </a>
          </div>
          |
          <div>
            Made with ❤️ by{" "}
            <a className="text-gray-200" href="https://twitter.com/kiliman">
              Kiliman
            </a>
          </div>
          |
          <div>
            View Source on{" "}
            <a
              className="text-gray-200"
              href="https://github.com/kiliman/boron-files"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Tree({
  tree,
  theme,
  level = 0,
}: {
  tree: any;
  theme: ThemeType;
  level?: number;
}) {
  let zoom = 2.0;
  let folders = Object.keys(tree).filter(
    (key) => Object.keys(tree[key]).length > 0
  );
  folders.sort();
  let files = Object.keys(tree).filter(
    (key) => Object.keys(tree[key]).length === 0
  );
  files.sort();

  return (
    <>
      <ul
        style={{
          listStyleType: "none",
          margin: 0,
          paddingInlineStart: 22 * zoom,
          backgroundColor: theme.background,
          borderLeftStyle: "dotted",
          borderLeftWidth: level === 0 ? 0 : 1 * zoom,
          borderLeftColor: theme.lines,
          marginLeft: level === 0 ? 0 : 8 * zoom,
          paddingLeft: level === 0 ? 0 : 12 * zoom,
        }}
      >
        <>
          {folders.map((key) => (
            <li key={key}>
              <div className="flex items-center py-[0.15rem]">
                <img
                  src={`https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/${getIconForOpenFolder(
                    key
                  )}`}
                  style={{
                    width: 16 * zoom,
                    height: 16 * zoom,
                    marginRight: 8 * zoom,
                  }}
                  alt={key}
                />
                <span>{key}</span>
              </div>
              {tree[key] && (
                <Tree tree={tree[key]} theme={theme} level={level + 1} />
              )}
            </li>
          ))}
        </>
        {files.map((key) => (
          <li
            key={key}
            style={{
              marginLeft: -22 * zoom,
            }}
          >
            <div className="flex items-center pt-[0.15rem]">
              <img
                src={`https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/${getIconForFile(
                  key
                )}`}
                style={{
                  width: 16 * zoom,
                  height: 16 * zoom,
                  marginRight: 8 * zoom,
                  marginLeft: 22 * zoom,
                }}
                alt={key}
              />
              <span>{key}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
