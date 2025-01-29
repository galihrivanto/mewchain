import { program } from "commander";
import { configureLogging, getLogger } from "./logging";
import { command as walletCmd } from "./cli/wallet";
import { command as nodeCmd } from "./cli/nodes";

const logger = getLogger(__filename);

export default async function main(argv: string[]) {
    configureLogging();

    process.on('unhandledRejection', (err) => {
        logger.error(err);
        setTimeout(() => process.exit(1), 1000);
    });

    process.on('uncaughtExceptionMonitor', (error) => {
        logger.error(error);
        setTimeout(() => process.exit(1), 1000);
    });

    try {
        await program
            .addCommand(nodeCmd)
            .addCommand(walletCmd)
            .parseAsync(argv);
        process.exit(0);
    } catch (e) {
        logger.error(e);
        setTimeout(() => process.exit(1), 1000);
    }
}

main(process.argv);
