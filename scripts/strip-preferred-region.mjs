import fs from "fs";
import path from "path";

function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(f.name)) {
      const s = fs.readFileSync(p, "utf8");
      const n = s.replace(
        /\r?\nexport const preferredRegion = \["hnd1"\];/g,
        ""
      );
      if (n !== s) {
        fs.writeFileSync(p, n);
        console.log("cleaned", p);
      }
    }
  }
}

walk("src");
