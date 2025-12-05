#!/usr/bin/env node

import path from "node:path";
import { fetchAllSchemas } from "./fetch-schemas";

// Get arguments from command line
const args = process.argv.slice(2);
const schemaDir = args[0] || path.join(process.cwd(), "schemas");

fetchAllSchemas(schemaDir);
