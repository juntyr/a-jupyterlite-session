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
    console.log('JupyterLab extension a-jupyterlab-session is activated!');

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
    const session = `${timestamp}-${salt}`;

    // Create the new directory
    await app.serviceManager.contents
      .newUntitled({
        type: 'directory' as Contents.ContentType,
        path: PathExt.dirname(session)
      })
      .then(async directory => {
        await app.serviceManager.contents.rename(directory.path, session);
      });

    // Navigate the filebrowser to the new session directory
    const filePath = PathExt.join('tree/', session);
    app.commands.execute('filebrowser:open-path', {
      path: filePath
    });
  }
};

export default plugin;
