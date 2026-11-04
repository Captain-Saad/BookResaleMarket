import type { Preview } from "@storybook/nextjs-vite";
import AuroraStage from "@/components/stage/aurora-stage";
import { fontVariables } from "@/lib/fonts";
import "@/styles/globals.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Colour theme",
      toolbar: { title: "Theme", icon: "mirror", items: ["dark", "light"], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "dark" },
  parameters: {
    layout: "centered",
    a11y: { test: "error" },
    viewport: {
      options: {
        phone: { name: "Phone 390", styles: { width: "390px", height: "844px" } },
        tablet: { name: "Tablet 768", styles: { width: "768px", height: "1024px" } },
        desktop: { name: "Desktop 1440", styles: { width: "1440px", height: "900px" } },
      },
    },
  },
  decorators: [
    (Story, context) => {
      document.documentElement.setAttribute("data-theme", context.globals.theme ?? "dark");
      document.documentElement.classList.add(...fontVariables.split(" "));
      return (
        <>
          <AuroraStage />
          <div className="p-6">
            <Story />
          </div>
        </>
      );
    },
  ],
};

export default preview;
