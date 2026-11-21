/** Diálogo «Fundamento»: abre con el botón, cierra con el botón, Esc o clic fuera. */
export const createHelp = (openButton: HTMLButtonElement, dialog: HTMLDialogElement): void => {
  // Safari anterior a 15.4 no tiene showModal(): se abre como diálogo no modal.
  const open = (): void => {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  };
  const close = (): void => {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  };
  openButton.addEventListener('click', open);
  dialog.querySelector('[data-close]')?.addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
};
