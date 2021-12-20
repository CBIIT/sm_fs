$(document).ready(
    function () {
  $(document).on('select2:open', () => {
    setTimeout(function() {
   document.querySelector('.select2-container--open .select2-search__field') .focus();;
    }, 10);
  });

  // list priscore null records last in datatable when sorting pri score ascendingly. 
  jQuery.fn.dataTableExt.oSort['scoretype-pre'] = function(x) {
    return x?x:999;
  };

});