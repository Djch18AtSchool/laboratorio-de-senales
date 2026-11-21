/** Diálogo «Fundamento»: abre con el botón, cierra con el botón, Esc o clic fuera. */
export const createHelp = (openButton: HTMLButtonElement, dialog: HTMLDialogElement): void => {
  openButton.addEventListener('click', () => dialog.showModal());
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
};
