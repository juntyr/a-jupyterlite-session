import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the a-jupyterlab-session extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'a-jupyterlab-session:plugin',
  description: 'A JupyterLab extension.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension a-jupyterlab-session is activated!');
  }
};

export default plugin;
