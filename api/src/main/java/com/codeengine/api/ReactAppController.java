package com.codeengine.api;

import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class ReactAppController implements ErrorController {

    @RequestMapping("/error")
    public String handleError() {
        // Any 404 or unknown route gracefully falls back to the React frontend
        return "forward:/index.html";
    }
}
