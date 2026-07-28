import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SEG VISIOM",
    short_name: "SEG VISIOM",
    description: "Gestão de campo para segurança, energia e conectividade.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#071a33",
    icons: [
      {
        src: "/segvisiom/logo-simbolo-transparente.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
