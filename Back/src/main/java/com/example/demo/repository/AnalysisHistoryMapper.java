package com.example.demo.repository;

import com.example.demo.domain.AnalysisHistoryRecord;
import com.example.demo.dto.AnalysisHistoryResponse;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AnalysisHistoryMapper {

	void insert(AnalysisHistoryRecord record);

	List<AnalysisHistoryResponse> findRecent(@Param("limit") int limit);
}
