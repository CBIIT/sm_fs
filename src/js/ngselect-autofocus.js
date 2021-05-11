$(document).ready(
    function () {
  $(document).on('select2:open', () => {
    setTimeout(function() {
   document.querySelector('.select2-container--open .select2-search__field') .focus();;
    }, 10);
  })
});