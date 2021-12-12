$(document).ready(function () {
    $(".viewmodal").on("click", function () {
        document.getElementById("iframe").src = this.value;
    });
});
