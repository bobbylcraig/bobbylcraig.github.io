var intro = true;
$(document).ready(function() {
    $(".open-window").hide();
    if (intro) {
        $(".open-window").show();
        $(".main-content").hide();
        $(".first").hide();
        $(".second").hide();
        $(".third").hide();
        $(".fourth").hide();
        $(".first").fadeIn("slow",function() {
            $(".first").delay(3000).fadeOut("slow", function() {
                $(".second").delay(1000).fadeIn("slow", function() {
                    $(".second").delay(3000).fadeOut("slow", function() {
                        $(".third").delay(1000).fadeIn("slow", function() {
                            $(".third").delay(3000).fadeOut("slow", function() {
                                $(".fourth").delay(1000).fadeIn("slow", function() {
                                    $(".fourth").delay(3000).fadeOut("slow", function() {
                                        $(".open-window").delay(1000).fadeOut("slow", function() {
                                            $(".main-content").fadeIn("slow");
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }
});