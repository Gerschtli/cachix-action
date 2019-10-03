"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const strings_1 = require("./strings");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // inputs
            const file = core.getInput('file');
            const attributes = core.getInput('attributes');
            const name = core.getInput('name', { required: true });
            const signingKey = core.getInput('signingKey');
            const authToken = core.getInput('authToken');
            core.startGroup('Installing Cachix');
            // TODO: use cachix official installation link
            yield exec.exec('nix-env', ['-iA', 'cachix', '-f', 'https://github.com/NixOS/nixpkgs/tarball/ab5863afada3c1b50fc43bf774b75ea71b287cde']);
            core.endGroup();
            // for private caches
            if (authToken !== "") {
                yield exec.exec('cachix', ['authtoken', authToken]);
            }
            core.startGroup(`Cachix: using ` + name);
            yield exec.exec('cachix', ['use', name]);
            core.endGroup();
            if (signingKey !== "") {
                core.exportVariable('CACHIX_SIGNING_KEY', signingKey);
            }
            // TODO: cachix use --watch-store
            core.startGroup(`Invoking nix-build`);
            let paths = '';
            const options = {
                listeners: {
                    stdout: (data) => {
                        paths += data.toString();
                    },
                }
            };
            const args = strings_1.prependEach('-A', strings_1.nonEmptySplit(attributes, /\s+/)).concat([file || "default.nix"]);
            yield exec.exec('nix-build', args, options);
            core.endGroup();
            // Needed for PRs
            if (signingKey !== "") {
                core.startGroup(`Cachix: pushing to ` + name);
                yield exec.exec('cachix', ['push', name].concat(strings_1.nonEmptySplit(paths, /\s+/)));
                core.endGroup();
            }
            else {
                console.log("No signing key. Assuming it's a pull request, nothing will be pushed.");
            }
        }
        catch (error) {
            core.setFailed(`Action failed with error: ${error}`);
            throw (error);
        }
    });
}
run();
