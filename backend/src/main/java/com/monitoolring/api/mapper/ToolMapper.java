package com.monitoolring.api.mapper;

import org.mapstruct.Mapper;

import com.monitoolring.api.domain.Tool;
import com.monitoolring.api.dto.ToolResponse;

@Mapper(componentModel = "spring")
public interface ToolMapper {

    ToolResponse toResponse(Tool tool);
}
