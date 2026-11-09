let select2Plugin: any;

export function installSelect2(jquery: any): () => void {
  const hadPlugin = Object.prototype.hasOwnProperty.call(jquery.fn, 'select2');
  const previousPlugin = jquery.fn.select2;
  const restore = () => {
    if (hadPlugin) jquery.fn.select2 = previousPlugin;
    else delete jquery.fn.select2;
  };
  if (!select2Plugin) {
    jquery.fn.select2 = undefined;
    try {
      const exported = require('select2/dist/js/select2.full.js');
      if (!jquery.fn.select2 && typeof exported === 'function') {
        exported(window, jquery);
      }
      if (!jquery.fn.select2) {
        throw new Error('Unable to install Select2 on the test jQuery instance.');
      }
      select2Plugin = jquery.fn.select2;
    } finally {
      restore();
    }
  }
  jquery.fn.select2 = select2Plugin;
  return restore;
}
