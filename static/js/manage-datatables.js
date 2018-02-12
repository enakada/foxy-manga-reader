/* eslint-disable */

// Manga Table
// ////////////////////////////////////////////////////////////////

let mangaTable;

const table = document.getElementById('manga-table-body');
table.addEventListener('table-loaded', () => {
  mangaTable = $('#manga-table').DataTable({
    pageLength: 50,
    order: [[1, 'asc']],
    columns: [
      { searchable: false, orderable: false },
      null,
      null,
      null,
    ],
    pagingType: 'first_last_numbers',
    stateSave: true,
    responsive: true,
  });
});

table.addEventListener('delete-rows', (event) => {
  const rowArr = event.detail.rows;
  mangaTable.rows(rowArr).remove().draw();
});


// Import Table
// ////////////////////////////////////////////////////////////////

let importDatatable;

const importTableContainer = document.getElementById('import-table-container');
importTableContainer.addEventListener('table-loaded', () => {
  importDatatable = $('#import-table').DataTable({
    order: [[3, 'asc']],
    columns: [
      { searchable: false, orderable: false },
      null,
      null,
      null,
    ],
    pagingType: 'first_last_numbers',
    stateSave: true,
  });
});

importTableContainer.addEventListener('push-rows', (event) => {
  const bookmarkListString = event.detail.bookmarks_str;
  mangaTable.rows.add(bookmarkListString).draw();
});

importTableContainer.addEventListener('delete', (event) => {
  if (importDatatable) importDatatable.destroy();
});


