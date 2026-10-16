package com.monitoolring.api.mapper;

import org.mapstruct.Mapper;

import com.monitoolring.api.domain.ReturnDeadlineSetting;
import com.monitoolring.api.dto.ReturnDeadlineResponse;

@Mapper(componentModel = "spring")
public interface ReturnDeadlineMapper {

    ReturnDeadlineResponse toResponse(ReturnDeadlineSetting setting);
}
