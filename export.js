/**
 * Gera um arquivo JSON a partir de um objeto de dados e inicia o download.
 * @param {string} fileName - O nome do arquivo para download (ex: 'projeto.json').
 * @param {Object} dataObject - O objeto de dados a ser convertido em JSON.
 */
function exportFile(fileName, dataObject) {
  if (!fileName || !dataObject) {
    console.error('Nome do arquivo ou objeto de dados inválido para exportação.');
    return;
  }

  const blob = new Blob([JSON.stringify(dataObject, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}