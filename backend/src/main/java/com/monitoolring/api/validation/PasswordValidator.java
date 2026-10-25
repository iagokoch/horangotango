package com.monitoolring.api.validation;

import com.monitoolring.api.security.PasswordPolicy;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PasswordValidator implements ConstraintValidator<ValidPassword, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // Ausência é tratada pelo @NotBlank; aqui se verifica a política de criação.
        return value == null || PasswordPolicy.isValidForCreation(value);
    }
}
