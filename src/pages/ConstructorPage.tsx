import { createRoot } from "react-dom/client";
import { SquircleEditor } from "../squircle";
import { createEditorSeed } from "./exampleData";
import "./pages.css";

createRoot(document.getElementById("root")!).render(
  <SquircleEditor
    title="Squircle Constructor"
    description="Build 0-N React squircle layers, tune strokes and annotations, then copy the generated component code."
    initialLayers={createEditorSeed()}
    codeComponentName="CustomSquircle"
    codeImportPath="@dstackai/sqircle"
    showCode
  />
);
