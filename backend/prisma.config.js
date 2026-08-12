"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const node_path_1 = require("node:path");
const config_1 = require("prisma/config");
exports.default = (0, config_1.defineConfig)({
    schema: node_path_1.default.join('prisma', 'schema.prisma'),
    migrations: {
        path: node_path_1.default.join('prisma', 'migrations'),
    },
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
//# sourceMappingURL=prisma.config.js.map