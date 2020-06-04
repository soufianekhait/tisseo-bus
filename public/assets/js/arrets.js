$(document).ready(function(){
    $('#addStopModal').on('shown.bs.modal', function () {
        $('#arret-nom').trigger('focus')
    });

    $('#editStopModal').on('shown.bs.modal', function () {
        $('#arret-nom-update').trigger('focus')
    });

    // Select/Deselect checkboxes
    var checkbox = $('table tbody input[type="checkbox"]');

    $("#selectAll").click(function(){
        if(this.checked){
            checkbox.each(function(){
                this.checked = true;
            });
        } else{
            checkbox.each(function(){
                this.checked = false;
            });
        }
    });

    checkbox.click(function(){
        if(!this.checked){
            $("#selectAll").prop("checked", false);
        }
    });

    var buttons = $("a.delete");
    var modalDeleteBtn = $("button.stop-delete-btn");

    buttons.click(function (event) {
        const id = event.target.getAttribute("data-id");
        modalDeleteBtn.attr("data-id", id);
        $("#deleteStopModal").modal("show");
        modal.find('.modal-body input').val(recipient)
        modalDeleteBtn.click(function(evt){
            const request = new XMLHttpRequest();
            request.onreadystatechange = function(){
                if (this.readyState == 4 && this.status == 200) {
                    if (this.responseText === "Item deleted") {
                        window.location.assign("/arrets");
                    }
                }
            };
            var attrs = evt.target.getAttribute("data-id").split('-');
            request.open('GET', '/arrets/delete/'+attrs[0]+'/'+attrs[1]);
            request.send();
            event.preventDefault();
        });
        event.preventDefault();
    });

    /*var editBtns = $("a.edit");

    editBtns.click(function (event) {
        const id = event.target.getAttribute("data-id");

        $("#addStopModal").modal("show");
        event.preventDefault();
    });*/

    $('#addStopModal').on('show.bs.modal', function (event) {
        var button = $(event.relatedTarget); // Button that triggered the modal
        var title = button.data('title'); // Extract info from data-* attributes
        // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
        // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
        var modal = $(this);
        modal.find('.modal-title').text(title);

        if(modal.find('.modal-title').text(title) === 'Modifier l\'arrêt'){
            modal.find('.modal-body .form-group input[name="nomArret"]').val("Victor");
        }
    });

    $("#addArret").click(function(event) {
        event.preventDefault();
        $.ajax({
            type: $("#add_form").attr("method"),
            url: $("#add_form").attr("action"),
            data: $("#add_form").serializeArray(),
            dataType: 'json'
        }).done(function(data) {
            $(".alert-danger").remove();
            $("#addStopModal").modal("show");

            if(data.errors){
                if (data.errors.nomArret)
                    $("#nomArret-group").append('<div class="alert alert-danger" role="alert">'+ data.errors.nomArret.msg + '</div>');
                if (data.errors.longitudeArret)
                    $("#longitudeArret-group").append('<div class="alert alert-danger" role="alert">'+ data.errors.longitudeArret.msg + '</div>');
                if (data.errors.latitudeArret)
                    $("#latitudeArret-group").append('<div class="alert alert-danger" role="alert">'+ data.errors.latitudeArret.msg + '</div>');
            }

            if(data.response){
                if (data.response === "Item added" || data.response === "Item exists"){
                    window.location.assign("/arrets");
                }
            }
        });
    });
});