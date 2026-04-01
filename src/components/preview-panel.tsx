interface Props {
  html?: string;
  status: string;
  description?: string;
}

function buildScaledPreviewHtml(html: string) {
  const injectedStyles = `
    <style id="preview-panel-scale-styles">
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        min-width: 0 !important;
        background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%) !important;
        overflow: auto !important;
      }

      #preview-scale-shell {
        padding: 16px;
        overflow: hidden;
      }

      #preview-scale-stage {
        transform-origin: top left;
        will-change: transform;
      }
    </style>
  `;

  const injectedScript = `
    <script>
      (() => {
        const MIN_SCALE = 0.48;
        const SIDE_PADDING = 32;

        function mount() {
          if (!document.body) {
            return;
          }

          let shell = document.getElementById("preview-scale-shell");
          let stage = document.getElementById("preview-scale-stage");

          if (!shell || !stage) {
            shell = document.createElement("div");
            shell.id = "preview-scale-shell";
            stage = document.createElement("div");
            stage.id = "preview-scale-stage";

            while (document.body.firstChild) {
              stage.appendChild(document.body.firstChild);
            }

            shell.appendChild(stage);
            document.body.appendChild(shell);
          }

          const contentRoot = stage.querySelector(".page") || stage.firstElementChild || stage;
          const baseWidth = Math.max(contentRoot.scrollWidth || 0, 920);
          const availableWidth = Math.max(window.innerWidth - SIDE_PADDING, 320);
          const scale = Math.min(1, Math.max(MIN_SCALE, availableWidth / baseWidth));

          stage.style.width = baseWidth + "px";
          stage.style.transform = "scale(" + scale + ")";
          shell.style.height = Math.ceil(stage.scrollHeight * scale + 24) + "px";
        }

        window.addEventListener("resize", mount);
        window.addEventListener("load", mount);
        setTimeout(mount, 0);
      })();
    </script>
  `;

  if (html.includes("</head>")) {
    return html.replace("</head>", `${injectedStyles}</head>`).replace("</body>", `${injectedScript}</body>`);
  }

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        ${injectedStyles}
      </head>
      <body>
        ${html}
        ${injectedScript}
      </body>
    </html>
  `;
}

export function PreviewPanel({ html, status, description }: Props) {
  return (
    <div className="glass-panel flex flex-col border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Preview</div>
          <div className="text-xs text-slate-500">{description || "Live result after generation"}</div>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
          {status}
        </div>
      </div>

      <div className="paper-preview overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-0">
        {html ? (
          <iframe
            title="Preview"
            srcDoc={buildScaledPreviewHtml(html)}
            className="h-[420px] w-full rounded-2xl bg-white xl:h-[460px]"
          />
        ) : (
          <div className="flex min-h-[420px] items-center justify-center p-8 text-center text-sm text-slate-500 xl:min-h-[460px]">
            Your generated document will appear here. Choose a mode, enter content, and click Generate.
          </div>
        )}
      </div>
    </div>
  );
}
