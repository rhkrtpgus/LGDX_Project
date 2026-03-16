from pydantic import BaseModel, Field


class YoutubeVideoItem(BaseModel):
    video_id: str = Field(alias="videoId")
    title: str
    channel_title: str | None = Field(default=None, alias="channelTitle")
    description: str | None = None
    thumbnail_url: str | None = Field(default=None, alias="thumbnailUrl")
    published_at: str | None = Field(default=None, alias="publishedAt")

    model_config = {
        "populate_by_name": True,
    }


class YoutubeVideoListResponse(BaseModel):
    items: list[YoutubeVideoItem]
