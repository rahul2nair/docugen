const major = Number(process.versions.node.split(".")[0]);

if (Number.isNaN(major) || major < 20) {
  console.error("\nNode.js 20+ is required for this project.");
  console.error(`Current runtime: ${process.version}`);
  console.error("Switch Node versions (for example: `nvm use`) and retry.\n");
  process.exit(1);
}
