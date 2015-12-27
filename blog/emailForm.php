<?php    
    require 'Mandrill.php';

    $mandrill = new Mandrill("a-8449aHhLw6pnmZxyumWA");

    $message = array(
        'subject' => 'Test message',
        'from_email' => 'bobbylcraig@gmail.com',
        'html' => '<p>this is a test message with Mandrill\'s PHP wrapper!.</p>',
        'to' => array(array('email' => 'bobbylcraig@gmail.com', 'Bobby' => 'Recipient 1')),
        'merge_vars' => array(array(
            'rcpt' => 'bobbylcraig@gmail.com',
            'vars' =>
            array(
                array(
                    'name' => 'FIRSTNAME',
                    'content' => 'Bobby'),
                array(
                    'name' => 'LASTNAME',
                    'content' => 'Last name')
        ))));

    $template_name = 'Stationary';

    $template_content = array(
        array(
            'name' => 'main',
            'content' => 'Hi *|FIRSTNAME|* *|LASTNAME|*, thanks for signing up.'),
        array(
            'name' => 'footer',
            'content' => 'Copyright 2012.')

    );
    print_r($mandrill->messages->sendTemplate($template_name, $template_content, $message));
?>