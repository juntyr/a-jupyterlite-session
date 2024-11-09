import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { PathExt } from '@jupyterlab/coreutils';
import { IDefaultFileBrowser } from '@jupyterlab/filebrowser';
import { Contents } from '@jupyterlab/services';
import { Token } from '@lumino/coreutils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Initialization data for the a-jupyterlab-session extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'a-jupyterlab-session:plugin',
  autoStart: true,
  requires: [IDefaultFileBrowser as unknown as Token<any>],
  activate: async (
    app: JupyterFrontEnd,
    defaultFileBrowser: IDefaultFileBrowser
  ) => {
    const SESSIONS = '.sessions';
    const REQUIREMENTS = 'requirements.txt';

    console.log('JupyterLab extension a-jupyterlab-session is activated!');

    await app.serviceManager.contents
      .get(SESSIONS, { content: false })
      .catch(() => {
        return app.serviceManager.contents
          .newUntitled({
            type: 'directory' as Contents.ContentType,
            path: PathExt.dirname(SESSIONS)
          })
          .then(async directory => {
            return await app.serviceManager.contents.rename(
              directory.path,
              SESSIONS
            );
          });
      });

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
    await app.serviceManager.contents
      .newUntitled({
        type: 'directory' as Contents.ContentType,
        path: PathExt.dirname(session)
      })
      .then(async directory => {
        return await app.serviceManager.contents.rename(
          directory.path,
          session
        );
      });

    // Navigate the filebrowser to the new session directory
    await app.commands.execute('filebrowser:open-path', {
      path: session
    });

    // Copy the current requirements.txt file to the new session folder
    await app.serviceManager.contents
      .copy(REQUIREMENTS, session)
      .catch(reason =>
        console.warn(
          `Failed to copy the ${REQUIREMENTS} file to the new session: ${reason}`
        )
      );
  }
};

export default plugin;
