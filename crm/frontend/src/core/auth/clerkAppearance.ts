/** Apariencia Clerk alineada con login SoftOne360 (PQRS / app municipal). */
export const clerkAuthAppearance = {
  variables: {
    colorPrimary: "#3eafd4",
    colorText: "#1e293b",
    colorBackground: "#ffffff",
    colorInputBackground: "#f0f9ff",
    colorInputText: "#0f172a",
    borderRadius: "0.5rem",
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "shadow-none w-full",
    card: "shadow-lg border border-slate-200 bg-white rounded-xl w-full overflow-hidden",
    headerTitle: "text-xl font-bold font-[Figtree]",
    headerSubtitle: "text-sm text-slate-500",
    formButtonPrimary:
      "bg-[#3eafd4] hover:bg-[#2f9fc2] text-white font-semibold rounded-[0.3rem] shadow-none normal-case",
    formFieldInput: "rounded-[0.3rem] border border-slate-300 focus:border-[#3eafd4]",
    footerActionLink: "text-[#0e7490] hover:text-[#3eafd4]",
    identityPreviewEditButton: { color: "#3eafd4" },
  },
} as const;
