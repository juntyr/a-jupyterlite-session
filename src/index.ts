import { PathExt } from '@jupyterlab/coreutils';
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
  activate: (app: JupyterLiteServer, contents: IContents) => {
    const SESSIONS = '.sessions';
    const REQUIREMENTS = 'requirements.txt';

    contents.ready.then(async () => {
      console.log(
        'JupyterLite server extension a-jupyterlab-session is activated!'
      );

      const storage = (await (contents as any).storage) as LocalForage;

      const now = new Date();

      if (!(await storage.getItem(SESSIONS))) {
        await storage.setItem(SESSIONS, {
          name: SESSIONS,
          path: SESSIONS,
          last_modified: now.toISOString(),
          created: now.toISOString(),
          format: 'json',
          mimetype: '',
          content: null,
          size: 0,
          writable: true,
          type: 'directory'
        });
      }

      // Generate a '%dd-%mm-%yyyy-%hh-%mm-%ss' timestamp
      const timestamp = now
        .toLocaleDateString('en-us', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h24'
        })
        .replace(/\//g, '-')
        .replace(/:/g, '-')
        .replace(', ', '-');
      const salt = uuidv4().slice(0, 8);

      // Generate a unique session directory name with the current time and a random suffix
      const session = PathExt.join(SESSIONS, `${timestamp}-${salt}`);

      // Create the new directory
      await storage.setItem(session, {
        name: PathExt.basename(session),
        path: session,
        last_modified: now.toISOString(),
        created: now.toISOString(),
        format: 'json',
        mimetype: '',
        content: null,
        size: 0,
        writable: true,
        type: 'directory'
      });

      // Navigate the filebrowser to the new session directory
      // FIXME: the command must be executed in the frontend
      app.commands.commandChanged.connect((_sender, { id, type }) => {
        if (id === 'filebrowser:open-path' && type === 'added') {
          app.commands
            .execute('filebrowser:open-path', {
              path: session
            })
            .catch(reason =>
              console.warn(
                `Failed to navigate to the new session folder: ${reason}`
              )
            );
        }
      });

      // Copy the current requirements.txt file to the new session folder
      await contents
        .copy(REQUIREMENTS, session)
        .catch(reason =>
          console.warn(
            `Failed to copy the ${REQUIREMENTS} file to the new session: ${reason}`
          )
        );
    });
  }
};

export default plugin;
