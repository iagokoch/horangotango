package com.monitoolring.api.mapper;

import org.mapstruct.Mapper;

import com.monitoolring.api.domain.User;
import com.monitoolring.api.dto.UserResponse;

@Mapper(componentModel = "spring")
public interface UserMapper {

    UserResponse toResponse(User user);
}
