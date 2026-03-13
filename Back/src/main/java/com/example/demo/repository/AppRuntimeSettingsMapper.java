package com.example.demo.repository;

import com.example.demo.domain.AppRuntimeSettingsRecord;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface AppRuntimeSettingsMapper {

	AppRuntimeSettingsRecord findCurrent();

	void upsert(AppRuntimeSettingsRecord record);
}
