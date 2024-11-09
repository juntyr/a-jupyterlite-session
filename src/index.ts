import { PathExt } from '@jupyterlab/coreutils';
import { Contents } from '@jupyterlab/services';
import { IContents } from '@jupyterlite/contents';
import {
  JupyterLiteServer,
  JupyterLiteServerPlugin
} from '@jupyterlite/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Initialization data for the a-jupyterlab-session extension.
 */
const plugin: JupyterLiteServerPlugin<void> = {
  id: 'a-jupyterlab-session:plugin',
  autoStart: true,
  requires: [IContents],
  activate: async (app: JupyterLiteServer, contents: IContents) => {
    const SESSIONS = '.sessions';
    const REQUIREMENTS = 'requirements.txt';

    console.log(
      'JupyterLite server extension a-jupyterlab-session is activated!'
    );

    if (!(await contents.get(SESSIONS, { content: false }))) {
      await contents
        .newUntitled({
          type: 'directory' as Contents.ContentType,
          path: PathExt.dirname(SESSIONS)
        })
        .then(async directory => {
          await contents.rename(directory!.path, SESSIONS);
        });
    }

    // Generate a '%dd.%mm.%yyyy-%hh:%mm:%ss' timestamp
    const timestamp = new Date()
      .toLocaleDateString('en-us', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h24'
      })
      .replace(/\//g, '.')
      .replace(', ', '-');
    const salt = uuidv4().slice(0, 8);

    // Generate a unique session directory name with the current time and a random suffix
    const session = PathExt.join(SESSIONS, `${timestamp}-${salt}`);

    // Create the new directory
    await contents
      .newUntitled({
        type: 'directory' as Contents.ContentType,
        path: PathExt.dirname(session)
      })
      .then(async directory => {
        await contents.rename(directory!.path, session);
      });

    // Navigate the filebrowser to the new session directory
    await app.commands.execute('filebrowser:open-path', {
      path: session
    });

    // Copy the current requirements.txt file to the new session folder
    await contents
      .copy(REQUIREMENTS, session)
      .catch(reason =>
        console.warn(
          `Failed to copy the ${REQUIREMENTS} file to the new session: ${reason}`
        )
      );
  }
};

export default plugin;
