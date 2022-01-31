let selectedcheckbox = [];
const axios = window.axios;


$(document).ready(function(){
    $('.checkbox').click(function(){
        if($(this).prop("checked") == true){
            selectedcheckbox.push($(this).val());
            selectedcheckbox = [...new Set(selectedcheckbox)];
            $("#hiddeninput").val(selectedcheckbox);
        }
        else if($(this).prop("checked") == false){
            selectedcheckbox.splice(selectedcheckbox.indexOf($(this).val()), 1);
            $("#hiddeninput").val(selectedcheckbox);
        }
    });
    if($("#error").val() != ''){
        $('#errorModal').modal('show');
    }
    $("#error").val('');
    
});

// function formsubmit(){
//     console.log(selectedcheckbox);
//     // const locationdata = await getLocation(userInput);
//     $.post('/getrecipeinfo',  {selectedcheckbox: selectedcheckbox} );    
// }

