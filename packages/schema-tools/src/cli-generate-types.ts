#!/usr/bin/env node

import path from "node:path";
import { generateTypes } from "./generate-types";

// Get arguments from command line
const args = process.argv.slice(2);
const schemaDir = args[0] || path.join(process.cwd(), "schemas");
const outputDir = args[1] || path.join(process.cwd(), "generated", "types");

generateTypes(schemaDir, outputDir);
