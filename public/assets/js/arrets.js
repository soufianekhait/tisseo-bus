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

    function updateArrayValues() {
        var allVals = [];
        $('.custom-checkbox :checked').each(function() {
            allVals.push($(this).val());
        });
        return allVals;
    }
    $(function() {
        $('.custom-checkbox input').click(updateArrayValues);
    });

    var modalDeleteBtn = $("button.stop-delete-btn");

    modalDeleteBtn.click(function(evt){
        console.log("arrau");
        const request = new XMLHttpRequest();
        request.onreadystatechange = function(){
            if (this.readyState == 4 && this.status == 200) {
                if (this.responseText === "Item deleted") {
                    window.location.assign("/arrets");
                }
            }
        };

        if(updateArrayValues().length !== 0){
            array = updateArrayValues();
            query = $.param(array, true );
            //query = http_build_query(array('aParam' => updateArrayValues()));
            request.open('GET', '/arrets/delete/'+query);
            request.send();
        }
        event.preventDefault();
    });

    var buttons = $("a.delete");

    buttons.click(function (event) {
        const id = event.target.getAttribute("data-id");
        modalDeleteBtn.attr("data-id", id);
        $("#deleteStopModal").modal("show");

        modalDeleteBtn.click(function(evt){
            console.log("arrau");
            const request = new XMLHttpRequest();
            request.onreadystatechange = function(){
                if (this.readyState == 4 && this.status == 200) {
                    if (this.responseText === "Item deleted") {
                        window.location.assign("/arrets");
                    }
                }
            };
            var attrs = evt.target.getAttribute("data-id").split('-');
            if(attrs.length !== 0){
                request.open('GET', '/arrets/delete/'+attrs[0]+'/'+attrs[1]);
                request.send();
            }
            event.preventDefault();
        });
        event.preventDefault();
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
                if (data.errors.trajetArret)
                    $("#trajetArret-group").append('<div class="alert alert-danger" role="alert">'+ data.errors.trajetArret.msg + '</div>');
            }

            if(data.response){
                if (data.response === "Item added" || data.response === "Item exists"){
                    window.location.assign("/arrets");
                }
            }
        });
    });


    $("a.edit").click(function(evt){
        const id = event.target.getAttribute("data-id");
        var attrs = id.split('-');
        var modal = $('#editStopModal');
        const request = new XMLHttpRequest();
        request.onreadystatechange = function(){
            if (this.readyState == 4 && this.status == 200) {
                let parsedData = JSON.parse(this.response);
                if (parsedData.response === "Got the items' values") {
                    modal.find('.modal-body-edit input[id="nomArret-edit"]').val(parsedData.data.nom_station);
                    modal.find('.modal-body-edit input[name="oldIdArret"]').val(parsedData.data.id_station);
                    modal.find('.modal-body-edit input[name="oldIdTrajet"]').val(attrs[0]);
                    modal.find('.modal-body-edit input[id="longitudeArret-edit"]').val(parsedData.data.longitude_station.toFixed(3));
                    modal.find('.modal-body-edit input[id="latitudeArret-edit"]').val(parsedData.data.latitude_station.toFixed(3));
                    modal.find('.modal-body-edit select[id="trajet-select-edit"]').val(attrs[0]);
                    modal.modal("show");
                }
            }
        };
        request.open('GET', '/arrets/update/'+attrs[1]);
        request.send();
        event.preventDefault();
    });


    $("#editArret").click(function(event) {
        event.preventDefault();
        $.ajax({
            type: $("#edit_form").attr("method"),
            url: $("#edit_form").attr("action"),
            data: $("#edit_form").serializeArray(),
            dataType: 'json'
        }).done(function(data) {
            $(".alert-danger").remove();
            $("#editStopModal").modal("show");

            if(data.errors){
                if (data.errors.nomArret)
                    $("#nomArret-group-edit").append('<div class="alert alert-danger" role="alert">'+ data.errors.nomArret.msg + '</div>');
                if (data.errors.longitudeArret)
                    $("#longitudeArret-group-edit").append('<div class="alert alert-danger" role="alert">'+ data.errors.longitudeArret.msg + '</div>');
                if (data.errors.latitudeArret)
                    $("#latitudeArret-group-edit").append('<div class="alert alert-danger" role="alert">'+ data.errors.latitudeArret.msg + '</div>');
                if (data.errors.trajetArret)
                    $("#trajetArret-group-edit").append('<div class="alert alert-danger" role="alert">'+ data.errors.trajetArret.msg + '</div>');
            }

            if(data.response){
                if (data.response === "Item updated"){
                    window.location.assign("/arrets");
                }
            }
        });
    });


    /*$("#search_form").keyup(function(){
        $.ajax({
            type: $("#search_form").attr("method"),
            url: $("#search_form").attr("action"),
            data: $("#search_form").serializeArray(),
            //contentType: 'application/json',
        }).done(function(data) {
            //console.log(data);
            $("table tbody").empty();
            $(".pagination").remove();
            console.log(data.arrets);
            for(var i=0;i<data.arrets.length;i++){
                $("table tbody").append(
                    '<tr>' +
                    '<td>' + data.arrets[i].num_ligne + '<td>' +
                    '<td>' + data.arrets[i]['depart.nom_station'] + '<td>' +
                    '<td>' + data.arrets[i]['terminus.nom_station'] + '<td>' +
                    '<td>' + data.arrets[i]['stop.nom_station'] + '<td>' +
                    '<td>' + data.arrets[i]['stop.longitude_station'] + '<td>' +
                    '<td>' + data.arrets[i]['stop.latitude_station'] + '<td>' +
                    '</tr>'
                );
            }
            //nunjucks.render('arrets', data);
        });
    });*/


});